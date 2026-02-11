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
