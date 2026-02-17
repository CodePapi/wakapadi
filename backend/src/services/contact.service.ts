// src/contact/contact.service.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateContactDto } from 'src/types/create-contact.dto';
import { ContactMessage, ContactMessageDocument } from '../schemas/contact-message.schema';

// src/contact/contact.service.ts
@Injectable()
export class ContactService {
  constructor(@InjectModel(ContactMessage.name) private model: Model<ContactMessageDocument>) {}

  async create(dto: CreateContactDto) {
    return this.model.create(dto);
  }

  async update(id: string, patch: Partial<any>) {
    return this.model.findByIdAndUpdate(id, { $set: patch }, { new: true }).exec();
  }

  async markAttended(id: string, attendedBy?: string, note?: string) {
    const now = new Date();
    return this.model.findByIdAndUpdate(id, { $set: { attended: true, attendedAt: now, attendedBy: attendedBy || null, attendedNote: note || null } }, { new: true }).exec();
  }

  async markUnattended(id: string) {
    return this.model.findByIdAndUpdate(id, { $set: { attended: false, attendedAt: null, attendedBy: null, attendedNote: null } }, { new: true }).exec();
  }

  async findAll() {
    return this.model.find().sort({ createdAt: -1 }).exec(); // for dashboard
  }

  async findPaginated(page = 1, limit = 20) {
    const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(limit, 100) : 20;
    const safePage = Number.isFinite(page) && page > 0 ? page : 1;
    const skip = (safePage - 1) * safeLimit;

    const [items, total] = await Promise.all([
      this.model.find().sort({ createdAt: -1 }).skip(skip).limit(safeLimit).lean(),
      this.model.countDocuments(),
    ]);

    return {
      items,
      total,
      page: safePage,
      limit: safeLimit,
    };
  }
}
