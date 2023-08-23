export enum EConfigKey {
  // NFT 721
  TransfersCurrBlock = 'TransfersCurrBlock',
  // NFT 1155
  TransferSinglesCurrBlock = 'TransferSingleCurrBlock',
  TransferBatchesCurrBlock = 'TransferBatchesCurrBlock',

  // NFT Status
  // Spot
  PlaceOrdersCurrBlock = 'PlaceOrdersCurrBlock',
  FillOrdersCurrBlock = 'FillOrdersCurrBlock',
  CancelOrdersCurrBlock = 'CancelOrdersCurrBlock',
  // Auction
  AuctionCreatedsCurrBlock = 'AuctionCreatedsCurrBlock',
  AuctionSuccessfulsCurrBlock = 'AuctionSuccessfulsCurrBlock',
  AuctionClaimedNFTsCurrBlock = 'AuctionClaimedNFTsCurrBlock'
}
