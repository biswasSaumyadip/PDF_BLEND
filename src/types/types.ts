export interface LinkUpdate {
  oldTarget: number;
  newTarget: number;
}

export interface LinkPageMap {
  [pageIndex: string]: LinkUpdate[];
}