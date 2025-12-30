import { Request, Response, NextFunction } from "express";

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);

  if (req.headers['x-payment-tx-id']) {
    console.log(`  Payment: ${req.headers['x-payment-tx-id']}`);
  } else {
    console.log(`  No payment`);
  }

  const originalSend = res.send;
  res.send = function(data) {
    if (res.statusCode === 402) {
      console.log(`  Response: 402 - Payment required`);
    } else if (res.statusCode === 200) {
      console.log(`  Response: 200 - OK`);
    } else {
      console.log(`  Response: ${res.statusCode}`);
    }
    return originalSend.call(this, data);
  };

  next();
};
