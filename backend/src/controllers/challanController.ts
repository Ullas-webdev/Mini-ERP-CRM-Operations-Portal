import { Request, Response, NextFunction } from 'express';

export const getChallans = async (_req: Request, res: Response): Promise<Response> => {
  return res.status(200).json({ status: 'success', data: { challans: [] } });
};

export const createChallan = async (_req: Request, res: Response): Promise<Response> => {
  return res.status(200).json({ status: 'success', data: {} });
};

export const getChallanById = async (_req: Request, res: Response): Promise<Response> => {
  return res.status(200).json({ status: 'success', data: {} });
};

export const updateChallan = async (_req: Request, res: Response): Promise<Response> => {
  return res.status(200).json({ status: 'success', data: {} });
};

export const confirmChallan = async (_req: Request, res: Response): Promise<Response> => {
  return res.status(200).json({ status: 'success', data: {} });
};

export const cancelChallan = async (_req: Request, res: Response): Promise<Response> => {
  return res.status(200).json({ status: 'success', data: {} });
};

export const createChallanSchema = {};
export const updateChallanSchema = {};
export const challanQuerySchema = {};
