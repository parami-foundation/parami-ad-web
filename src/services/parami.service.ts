import { BigNumber } from "ethers";
import { doGraghQueryParami } from "../utils/api.util";
import { deleteComma } from "../utils/format.util";

export interface AdSlot {
  adAsset: 'Currency' | { Asset: string };
  adId: string;
  budgetPot: string;
  nftId: string;
  created: string;
}

export const getParamiNftExternal = async (nftId: string) => {
  const res = await window.apiWs.query.nft.external(nftId);
  if (res.isEmpty) {
    return null;
  }

  const external = await res.toHuman() as {
    owner: string;
    network: string;
    namespace: string;
    token: string;
  };

  return {
    owner: external.owner,
    network: external.network,
    tokenId: `${parseInt(external.token)}`,
    address: external.namespace
  }
}

export const getAdSlotOfNftId = async (nftId: string) => {
  const slotRes = await window.apiWs.query.ad.slotOf(nftId);
  if (slotRes.isEmpty) {
    return null;
  }

  return await slotRes.toHuman() as unknown as AdSlot;
}

export const getSitBalanceOfBudgetPot = async (budgetPotId: string, assetId: string) => {
  const balanceRes = await window.apiWs.query.assets.account(assetId, budgetPotId);
  if (balanceRes.isEmpty) {
    return null;
  }
  const { balance } = balanceRes.toHuman() as { balance: string };
  return balance;
}

export const getCurrentPriceOfNftId = async (nftId: string) => {
  if (!nftId) {
    return '0';
  }

  const slot = await getAdSlotOfNftId(nftId);
  if (!slot?.budgetPot) {
    return '0';
  }

  if (slot.adAsset === 'Currency') {
    return await getAvailableAd3BalanceOnParami(slot.budgetPot) ?? '0';
  }

  const balance = await getSitBalanceOfBudgetPot(slot.budgetPot, deleteComma(slot.adAsset.Asset)) as string;
  return deleteComma(balance) ?? '0';
}

export const getAvailableAd3BalanceOnParami = async (account: string) => {
  const accountRes = await window.apiWs.query.system.account(account);

  if (accountRes.isEmpty) {
    return null;
  }

  const balance = await accountRes.toHuman() as { data: { free: string } };
  return deleteComma(balance.data.free)
}

export const getPortedNftIdOfHnft = async (contractAddress: string, tokenId: string) => {
  const portedRes = await window.apiWs.query.nft.ported('Ethereum', contractAddress, BigNumber.from(tokenId).toHexString());

  if (portedRes.isEmpty) {
    return null;
  }

  const nftId = portedRes.toHuman() as string;
  return deleteComma(nftId);
}

export const getNFTIdsOfOwnerDid = async (did: string) => {
  try {
    const query = `query {
      nfts(
        filter: { kolDid: { equalTo: "${did}" } }
      ) {
        nodes {
          id
        }
      }
    }`;
    const res = await doGraghQueryParami(query);

    if (!res) {
      return;
    }

    const data = await res.json();
    return data.data.nfts.nodes.map((node: { id: string }) => node.id) as string[]

  } catch (e) {
    console.error(e)
    return;
  }
}

export const getActiveBidNftIdsOfDid = async (did: string) => {
  const query = `query {
    advertisementBids(filter: {and: [{advertiser: {equalTo: "${did.toLowerCase()}"}}, {active: {equalTo: true}}]}) {
      nodes {
        nftId
      }
    }
  }`;
  const res = await doGraghQueryParami(query);

  if (!res) {
    return [];
  }

  const { data } = await res.json();
  return ((data?.advertisementBids?.nodes ?? []) as { nftId: string }[]).map(node => node.nftId);
}

export const getNftMetadata = async (nftId: string) => {
  const metadataRes = await window.apiWs.query.nft.metadata(nftId);
  if (metadataRes.isEmpty) {
    return null;
  }
  const metadata = metadataRes.toHuman() as {
    minted: boolean,
    owner: string,
    pot: string,
    tokenAssetId: string,
    classId: string
  };
  return {
    minted: metadata.minted,
    owner: metadata.owner,
    pot: metadata.pot,
    id: deleteComma(metadata.tokenAssetId)
  }
}

export const getSwapMetadataOfNftId = async (nftId: string) => {
  const metadataRes = await window.apiWs.query.swap.metadata(nftId);
  if (metadataRes.isEmpty) {
    return null;
  }

  const metadata = metadataRes.toHuman() as {
    created: string,
    liquidity: string,
    enableStaking: boolean
  };
  return {
    created: deleteComma(metadata.created),
    liquidity: deleteComma(metadata.liquidity),
    enableStaking: metadata.enableStaking
  }
}

export const getAssetMetadataOfNftId = async (nftId: string) => {
  const metadataRes = await window.apiWs.query.assets.metadata(nftId);
  if (metadataRes.isEmpty) {
    return null;
  }

  const metadata = metadataRes.toHuman();
  console.log('asset metadata', metadata);
  return metadata;
}

// export const testGraphQL = async () => {
//   const query = `query {
//     advertisementBids(first:100) {
//       nodes {
//         nftId,
//         advertiser,
//         active
//       }
//     }
//   }`;
//   const res = await doGraghQueryParami(query);

//   if (!res) {
//     return [];
//   }

//   const { data } = await res.json();
//   return ((data?.advertisementBids?.nodes ?? []) as { nftId: string }[]).map(node => node.nftId);
// }
