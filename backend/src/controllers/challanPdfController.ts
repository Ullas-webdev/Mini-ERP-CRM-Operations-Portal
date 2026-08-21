import { Request, Response } from 'express';

export const exportChallanPdf = async (_req: Request, res: Response): Promise<Response> => {
  return res.status(200).json({ status: 'success', message: 'PDF export stub' });
};
