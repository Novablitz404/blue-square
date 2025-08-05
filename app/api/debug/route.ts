import { NextRequest, NextResponse } from 'next/server';

const ALCHEMY_API_KEY = 'YF_r89mDAkK17Qrdqlfm3';
const BASE_NETWORK_URL = `https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address');

  if (!address) {
    return NextResponse.json({ error: 'Address parameter is required' }, { status: 400 });
  }

  try {
    // Test both inbound and outbound calls
    const results: {
      outbound: unknown;
      inbound: unknown;
      error: string | null;
    } = {
      outbound: null,
      inbound: null,
      error: null
    };

    // Test outbound
    try {
      const outboundResponse = await fetch(`${BASE_NETWORK_URL}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'alchemy_getAssetTransfers',
          params: [{
            fromBlock: '0x0',
            toBlock: 'latest',
            fromAddress: address,
            category: ['external', 'erc20', 'erc721', 'erc1155'],
            maxCount: '0x32',
          }],
        }),
      });

      const outboundData = await outboundResponse.json();
      results.outbound = outboundData;
    } catch (error) {
      results.error = `Outbound error: ${error}`;
    }

    // Test inbound
    try {
      const inboundResponse = await fetch(`${BASE_NETWORK_URL}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'alchemy_getAssetTransfers',
          params: [{
            fromBlock: '0x0',
            toBlock: 'latest',
            toAddress: address,
            category: ['external', 'erc20', 'erc721', 'erc1155'],
            maxCount: '0x32',
          }],
        }),
      });

      const inboundData = await inboundResponse.json();
      results.inbound = inboundData;
    } catch (error) {
      results.error = `Inbound error: ${error}`;
    }

    return NextResponse.json({
      success: true,
      address,
      results,
    });
  } catch (error) {
    console.error('Debug error:', error);
    return NextResponse.json({ error: 'Debug failed' }, { status: 500 });
  }
} 