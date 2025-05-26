import { Document } from 'mongoose';
import { WhoisMessage } from '../schemas/whois-message.schema';

export interface WhoisMessageDocument extends WhoisMessage, Document {
  createdAt: Date;
  updatedAt: Date;
}