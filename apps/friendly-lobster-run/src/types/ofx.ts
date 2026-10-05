export interface OfxTransaction {
  type: "CREDIT" | "DEBIT";
  date: string;
  amount: number;
  fitId: string;
  memo: string;
}

export interface OfxData {
  header: any;
  body: {
    account: {
      balance: number;
      currency: string;
      startDate: string;
      endDate: string;
    };
    transactions: OfxTransaction[];
  };
}