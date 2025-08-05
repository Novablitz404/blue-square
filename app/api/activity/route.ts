import { NextRequest, NextResponse } from 'next/server';
import { saveUserActivity, getUserActivity, addUserActivity, updateLastScannedBlock } from '../../../lib/firebase-service';
import { getUserQuestData } from '../../../lib/quest-service';

// Alchemy API configuration
const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY;
const BASE_NETWORK_URL = `https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`;

// Try different Base endpoints
// const BASE_NETWORK_URL = `https://base-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`;
// const BASE_NETWORK_URL = `https://base.g.alchemy.com/v2/${ALCHEMY_API_KEY}`;

interface ActivityData {
  address: string;
  type: 'token_transfer' | 'nft_transfer' | 'contract_interaction' | 'swap' | 'stake' | 'mint';
  hash: string;
  timestamp: number;
  description: string;
  direction: 'inbound' | 'outbound';
}

interface PointsCalculation {
  token_transfer: 10;
  nft_transfer: 25;
  contract_interaction: 15;
  swap: 30;
  stake: 20;
  mint: 35;
}

const POINTS_MAP: PointsCalculation = {
  token_transfer: 10,
  nft_transfer: 25,
  contract_interaction: 15,
  swap: 30,
  stake: 20,
  mint: 35,
};

// Mock database for storing user activity and points - now using Firebase instead

// NFT collection name mapping - we can expand this as needed
const NFT_COLLECTION_NAMES: Record<string, string> = {
  '0xe3eb165c9ed6d6d87a59c410c8f30babac44fefd': 'BetaAccess',
  '0x03c4738ee98ae44591e1a4a4f3cab6641d95dd9a': 'Basenames',
  // Add more contract addresses and their collection names here
};

// Cache for discovered contract addresses and their names
const discoveredContracts = new Map<string, string>();

interface TransferData {
  rawContract?: {
    address?: string;
  };
}

async function discoverAndCacheNFTContract(transfer: TransferData): Promise<string | null> {
  if (!transfer.rawContract?.address) {
    return null;
  }

  const contractAddress = transfer.rawContract.address.toLowerCase();
  
  // Check if we already discovered this contract
  if (discoveredContracts.has(contractAddress)) {
    return discoveredContracts.get(contractAddress) || null;
  }

  // Try to get the collection name
  const collectionName = await getNFTCollectionName(contractAddress);
  
  if (collectionName) {
    // Cache the discovered contract
    discoveredContracts.set(contractAddress, collectionName);
    console.log(`Discovered new NFT contract: ${contractAddress} -> ${collectionName}`);
  }

  return collectionName;
}

async function getNFTCollectionName(contractAddress: string): Promise<string | null> {
  // First check our local mapping
  if (NFT_COLLECTION_NAMES[contractAddress.toLowerCase()]) {
    return NFT_COLLECTION_NAMES[contractAddress.toLowerCase()];
  }

  try {
    // Try to get collection name from Alchemy NFT API
    const response = await fetch(`${BASE_NETWORK_URL}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'alchemy_getContractMetadata',
        params: [contractAddress],
      }),
    });

    if (response.ok) {
      const data = await response.json();
      console.log('Alchemy contract metadata response:', data);
      
      if (data.result?.name) {
        return data.result.name;
      }
    }
  } catch (error) {
    console.error('Error fetching NFT collection name:', error);
  }

  // Fallback to the asset name from the transfer
  return null;
}

async function fetchAlchemyTransactions(address: string, direction: 'inbound' | 'outbound') {
  try {
    const params = {
      jsonrpc: '2.0',
      id: 1,
      method: 'alchemy_getAssetTransfers',
      params: [
        {
          fromBlock: '0x0',
          toBlock: 'latest',
          category: ['external', 'erc20', 'erc721', 'erc1155'],
          maxCount: '0x32', // 50 transactions
          ...(direction === 'outbound' 
            ? { fromAddress: address }
            : { toAddress: address }
          ),
        },
      ],
    };

    const response = await fetch(`${BASE_NETWORK_URL}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new Error(`Alchemy API error: ${response.status}`);
    }

    const data = await response.json();
    const transfers = data.result?.transfers || [];
    
    return transfers;
  } catch (error) {
    console.error(`Error fetching Alchemy ${direction} data:`, error);
    return [];
  }
}

interface TransactionTransfer {
  category?: string;
  asset?: string;
  to?: string;
  from?: string;
}

interface AlchemyTransfer extends TransactionTransfer {
  hash: string;
  blockNum: string;
  tokenId?: string;
  rawContract?: {
    address?: string;
  };
}

function categorizeTransaction(transfer: TransactionTransfer): 'token_transfer' | 'nft_transfer' | 'contract_interaction' | 'swap' | 'stake' | 'mint' {
  const category = transfer.category;
  
  if (category === 'erc721' || category === 'erc1155') {
    return 'nft_transfer';
  }
  
  if (category === 'erc20') {
    // Check if it's a swap by looking at common DEX contracts
    const toAddress = transfer.to?.toLowerCase();
    
    if (toAddress && (
      toAddress.includes('uniswap') || 
      toAddress.includes('sushiswap') || 
      toAddress.includes('pancakeswap') ||
      toAddress.includes('0x7a250d5630b4cf539739df2c5dacb4c659f2488d') // Uniswap V2 Router
    )) {
      return 'swap';
    }
    return 'token_transfer';
  }
  
  if (category === 'external' || category === 'internal') {
    // Check if it's a staking interaction
    const toAddress = transfer.to?.toLowerCase();
    
    if (toAddress && (
      toAddress.includes('stake') || 
      toAddress.includes('validator') ||
      toAddress.includes('0x00000000219ab540356cbb839cbe05303d7705fa') // Beacon deposit contract
    )) {
      return 'stake';
    }
    
    // Check if it's a mint (contract creation or NFT mint)
    if (transfer.to === null || transfer.to === undefined) {
      return 'mint';
    }
    
    return 'contract_interaction';
  }
  
  return 'contract_interaction';
}

function createActivityDescription(transfer: TransactionTransfer, type: string): string {
  const asset = transfer.asset;
  
  switch (type) {
    case 'token_transfer':
      return `${asset || 'tokens'}`;
    case 'nft_transfer':
      const nftName = asset || 'NFT';
      return `${nftName}`;
    case 'swap':
      return `tokens via DEX`;
    case 'stake':
      return `tokens to staking`;
    case 'mint':
      return `new token/NFT`;
    case 'contract_interaction':
      return `smart contract`;
    default:
      return `transaction`;
  }
}

function capitalizeFirstLetter(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address');
  const direction = searchParams.get('direction') as 'inbound' | 'outbound' | 'all';
  const forceRefresh = searchParams.get('forceRefresh') === 'true';

  if (!address) {
    return NextResponse.json({ error: 'Address parameter is required' }, { status: 400 });
  }

  try {
    // First, try to get existing data from Firebase
    let userData = await getUserActivity(address);
    let shouldScan = false;
    
    if (!userData) {
      // If no Firebase data exists, perform initial scan
      shouldScan = true;
      console.log(`Starting initial scan for ${address}`);
    } else if (forceRefresh) {
      // Force refresh: always scan
      shouldScan = true;
      console.log(`Starting forced refresh scan for ${address}`);
    } else if (userData.isInitialScanComplete) {
      // Wallet reconnection: Check for new blocks since last scan
      const currentBlock = await getCurrentBlockNumber();
      if (currentBlock && userData.lastScannedBlock && currentBlock > userData.lastScannedBlock) {
        shouldScan = true;
        console.log(`Wallet reconnection scan for ${address}: ${userData.lastScannedBlock} -> ${currentBlock}`);
      }
    }

    if (shouldScan) {
      // Perform blockchain scan
      const scanResult = await performBlockchainScan(address, userData?.lastScannedBlock);
      
      if (scanResult.newActivities.length > 0) {
        // Merge with existing activities
        const existingActivities = userData?.activities || [];
        const allActivities = [...scanResult.newActivities, ...existingActivities];
        
        // Remove duplicates and sort
        const uniqueActivities = allActivities.filter((activity, index, self) => {
          const isDuplicate = index !== self.findIndex(a => {
            if (activity.type === 'nft_transfer' && a.type === 'nft_transfer') {
              return a.hash === activity.hash && 
                     a.direction === activity.direction && 
                     a.asset === activity.asset && 
                     a.tokenId === activity.tokenId;
            } else {
              return a.hash === activity.hash && a.direction === activity.direction;
            }
          });
          return !isDuplicate;
        });

        uniqueActivities.sort((a, b) => b.timestamp - a.timestamp);
        const totalPoints = uniqueActivities.reduce((sum: number, activity) => sum + activity.points, 0);
        
        // Get quest points for combined calculation
        const questData = await getUserQuestData(address);
        const questPoints = questData?.totalQuestPoints || 0;
        const combinedPoints = totalPoints + questPoints;
        
        // Save to Firebase with combined points
        await saveUserActivity(address, {
          address,
          activities: uniqueActivities,
          totalPoints,
          combinedPoints,
          level: getLevelFromPoints(combinedPoints),
          lastUpdated: new Date(),
          lastScannedBlock: scanResult.lastScannedBlock,
          isInitialScanComplete: true,
        });

        userData = {
          address,
          activities: uniqueActivities,
          totalPoints,
          combinedPoints,
          level: getLevelFromPoints(combinedPoints),
          lastUpdated: new Date(),
          lastScannedBlock: scanResult.lastScannedBlock,
          isInitialScanComplete: true,
        };
      } else {
        // Update last scanned block even if no new activities
        if (scanResult.lastScannedBlock) {
          await updateLastScannedBlock(address, scanResult.lastScannedBlock);
        }
      }
    }

    // Get combined points from stored data or calculate if not available
    const questData = await getUserQuestData(address);
    const questPoints = questData?.totalQuestPoints || 0;
    const activityPoints = userData?.totalPoints || 0;
    const storedCombinedPoints = userData?.combinedPoints || 0;
    const combinedPoints = storedCombinedPoints > 0 ? storedCombinedPoints : (activityPoints + questPoints);
    
    // Calculate level based on combined points
    const combinedLevel = getLevelFromPoints(combinedPoints);
    
    // Filter activities based on direction
    let filteredActivities = userData?.activities || [];
    if (direction === 'inbound') {
      filteredActivities = (userData?.activities || []).filter(a => a.direction === 'inbound');
    } else if (direction === 'outbound') {
      filteredActivities = (userData?.activities || []).filter(a => a.direction === 'outbound');
    }

    return NextResponse.json({
      success: true,
      data: {
        activities: filteredActivities,
        totalPoints: combinedPoints,
        activityPoints: activityPoints,
        questPoints: questPoints,
        level: combinedLevel,
        inboundCount: (userData?.activities || []).filter(a => a.direction === 'inbound').length,
        outboundCount: (userData?.activities || []).filter(a => a.direction === 'outbound').length,
        lastScannedBlock: userData?.lastScannedBlock,
        isInitialScanComplete: userData?.isInitialScanComplete || false,
      },
    });
  } catch (error) {
    console.error('Error fetching activity:', error);
    return NextResponse.json({ error: 'Failed to fetch activity' }, { status: 500 });
  }
}

function getLevelFromPoints(points: number): string {
  if (points >= 1000) return 'Diamond';
  if (points >= 500) return 'Platinum';
  if (points >= 200) return 'Gold';
  if (points >= 100) return 'Silver';
  if (points >= 50) return 'Bronze';
  return 'Newbie';
}

async function getCurrentBlockNumber(): Promise<number | null> {
  try {
    const response = await fetch(`${BASE_NETWORK_URL}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_blockNumber',
        params: [],
      }),
    });

    const data = await response.json();
    if (data.result) {
      return parseInt(data.result, 16);
    }
    return null;
  } catch (error) {
    console.error('Error getting current block number:', error);
    return null;
  }
}

interface ActivityData {
  id: string;
  type: 'token_transfer' | 'nft_transfer' | 'contract_interaction' | 'swap' | 'stake' | 'mint';
  description: string;
  timestamp: number;
  points: number;
  hash: string;
  direction: 'inbound' | 'outbound';
  asset?: string;
  tokenId?: string;
}

async function performBlockchainScan(address: string, fromBlock?: number): Promise<{
  newActivities: ActivityData[];
  lastScannedBlock: number;
}> {
  let activities: ActivityData[] = [];
  let lastScannedBlock = fromBlock || 0;
  
  try {
    // Get current block number
    const currentBlock = await getCurrentBlockNumber();
    if (!currentBlock) {
      throw new Error('Failed to get current block number');
    }

    // Fetch all transactions (inbound and outbound)
    const [outboundTransfers, inboundTransfers] = await Promise.all([
      fetchAlchemyTransactions(address, 'outbound'),
      fetchAlchemyTransactions(address, 'inbound'),
    ]);

    // Process outbound transactions
    const outboundActivities = await Promise.all(outboundTransfers.map(async (transfer: AlchemyTransfer) => {
      const type = categorizeTransaction(transfer);
      const points = POINTS_MAP[type] || 5;
      
      let description = capitalizeFirstLetter(createActivityDescription(transfer, type));
      if (type === 'nft_transfer') {
        const collectionName = await discoverAndCacheNFTContract(transfer);
        if (collectionName) {
          description = collectionName;
        }
      }
      
      return {
        id: transfer.hash,
        type,
        description,
        timestamp: parseInt(transfer.blockNum, 16) * 1000,
        points,
        hash: transfer.hash,
        direction: 'outbound' as const,
        asset: transfer.asset,
        tokenId: transfer.tokenId,
      };
    }));

    // Process inbound transactions
    const inboundActivities = await Promise.all(inboundTransfers.map(async (transfer: AlchemyTransfer) => {
      const type = categorizeTransaction(transfer);
      const points = POINTS_MAP[type] || 5;
      
      let description = capitalizeFirstLetter(createActivityDescription(transfer, type));
      if (type === 'nft_transfer') {
        const collectionName = await discoverAndCacheNFTContract(transfer);
        if (collectionName) {
          description = collectionName;
        }
      }
      
      return {
        id: transfer.hash,
        type,
        description,
        timestamp: parseInt(transfer.blockNum, 16) * 1000,
        points,
        hash: transfer.hash,
        direction: 'inbound' as const,
        asset: transfer.asset,
        tokenId: transfer.tokenId,
      };
    }));

    activities = [...outboundActivities, ...inboundActivities];
    lastScannedBlock = currentBlock;

    console.log(`Scan completed for ${address}: ${activities.length} activities found, scanned to block ${lastScannedBlock}`);
  } catch (error) {
    console.error('Error during blockchain scan:', error);
  }

  return {
    newActivities: activities,
    lastScannedBlock,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: ActivityData = await request.json();
    const { address, type, hash, timestamp, description, direction } = body;

    if (!address || !type || !hash) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Calculate points for this activity
    const points = POINTS_MAP[type] || 5;

    // Create new activity
    const newActivity = {
      id: `${hash}-${timestamp}`,
      type,
      description,
      timestamp,
      points,
      hash,
      direction: direction || 'outbound',
    };

    // Add to Firebase
    await addUserActivity(address, newActivity);

    return NextResponse.json({
      success: true,
      data: {
        activity: newActivity,
      },
    });
  } catch (error) {
    console.error('Error recording activity:', error);
    return NextResponse.json({ error: 'Failed to record activity' }, { status: 500 });
  }
} 