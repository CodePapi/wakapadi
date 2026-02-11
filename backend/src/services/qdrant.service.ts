import { Injectable, OnModuleInit } from '@nestjs/common';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

import { fetch, Headers, Request, Response, FormData } from 'undici';
globalThis.fetch = fetch as any;
globalThis.Headers = Headers as any;
globalThis.Request = Request as any;
globalThis.Response = Response as any;
globalThis.FormData = FormData as any;

@Injectable()
export class QdrantService implements OnModuleInit {
  private baseURL: string;
  private apiKey: string;
  private enabled: boolean;

  constructor() {
    this.baseURL = process.env.QDRANTURL || '';
    this.apiKey = process.env.QDRANTAPIKEYS || '';
    this.enabled = Boolean(this.baseURL);
  }

  async onModuleInit() {
    if (!this.enabled) {
      console.warn('⚠️ Qdrant is not configured; vector search is disabled.');
      return;
    }

    const reachable = await this.pingQdrant();
    if (!reachable) {
      console.warn('⚠️ Qdrant is unreachable; vector search is disabled.');
      this.enabled = false;
      return;
    }

    await this.recreateToursCollection(); // recreates with correct payload_schema
    await this.createTrainingCollection();
  }

  private async pingQdrant(): Promise<boolean> {
    try {
      await axios.get(`${this.baseURL}/collections`, {
        headers: this.headers,
        timeout: 5000,
      });
      return true;
    } catch (err) {
      console.warn('⚠️ Qdrant health check failed:', err.response?.data || err.message);
      return false;
    }
  }

  private get headers() {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.apiKey) headers['api-key'] = this.apiKey;
    return headers;
  }

  async recreateToursCollection() {
    if (!this.enabled) return;
    try {
    //   await axios.delete(`${this.baseURL}/collections/tours`, {
    //     headers: this.headers,
    //   });
    //   console.log('🗑️ Deleted "tours" collection');

      await axios.put(
        `${this.baseURL}/collections/tours`,
        {
          vectors: {
            size: 384,
            distance: 'Cosine',
          },
          on_disk_payload: true,
          payload_schema: {
            location: { type: 'keyword' },
            activity: { type: 'keyword' }, // optional
          },
        },
        { headers: this.headers }
      );
      console.log('✅ Recreated "tours" collection with indexed schema');
    } catch (err) {
      console.error('❌ Error recreating collection:', err.response?.data || err.message);
    }
  }

  async upsertTour(originalId: string, vector: number[], payload: Record<string, any>) {
    if (!this.enabled) return;
    try {
      const id = uuidv4();
      const enrichedPayload = {
        ...payload,
        mongoId: originalId,
      };

      await axios.put(
        `${this.baseURL}/collections/tours/points`,
        {
          points: [{ id, vector, payload: enrichedPayload }],
        },
        { headers: this.headers }
      );

      console.log(`✅ Upserted tour: ${id}`);
    } catch (err: any) {
      console.error('❌ Upsert failed:', err.response?.data || err.message);
    }
  }

  async searchSimilarTours(
    vector: number[],
    limit: number = 5,
    threshold: number = 0.7,
    city?: string
  ) {
    if (!this.enabled) return [];
    try {
      const filter = city
        ? {
            must: [
              {
                key: 'location',
                match: { value: city.toLowerCase() },
              },
            ],
          }
        : undefined;

      const payload = {
        vector,
        limit,
        score_threshold: threshold,
        with_payload: true,
        with_vectors: false,
        filter,
      };

      console.debug(`Qdrant search payload: ${JSON.stringify(payload)}`);

      const response = await axios.post(
        `${this.baseURL}/collections/tours/points/search`,
        payload,
        {
          headers: this.headers,
          timeout: 10000,
        }
      );

      console.debug(`Qdrant search successful. Results: ${response.data.result.length}`);
    //   return response.data.result;
    return Array.isArray(response.data.result) ? response.data.result : [];

    } catch (error) {
      console.error('Qdrant search failed:', error.response?.data || error.message);
      return [];
    }
  }

  async upsertTrainingPhrase(phrase: string, vector: number[], city: string) {
    if (!this.enabled) return;
    try {
      await axios.put(
        `${this.baseURL}/collections/training_phrases/points`,
        {
          points: [
            {
              id: uuidv4(),
              vector,
              payload: {
                phrase,
                city,
                type: 'training',
              },
            },
          ],
        },
        { headers: this.headers }
      );
    } catch (err) {
      console.error('Failed to upsert training phrase:', err);
    }
  }

  async findSimilarTrainingPhrases(vector: number[], limit = 3) {
    if (!this.enabled) return [];
    try {
      const res = await axios.post(
        `${this.baseURL}/collections/training_phrases/points/search`,
        {
          vector,
          limit,
          with_payload: true,
        },
        { headers: this.headers }
      );
      return res.data.result;
    } catch (err) {
      console.error('Training phrase search failed:', err);
      return [];
    }
  }

  async getTrainingPhraseCount() {
    if (!this.enabled) return 0;
    try {
      const res = await axios.post(
        `${this.baseURL}/collections/training_phrases/points/count`,
        {
          filter: {
            must: [{ key: 'type', match: { value: 'training' } }],
          },
        },
        { headers: this.headers }
      );
      return res.data.result.count;
    } catch (error) {
      console.error('Failed to count training phrases:', error);
      return 0;
    }
  }

  async clearTrainingPhrases() {
    if (!this.enabled) return;
    try {
      await axios.put(
        `${this.baseURL}/collections/training_phrases/points/delete`,
        {
          filter: {
            must: [{ key: 'type', match: { value: 'training' } }],
          },
        },
        { headers: this.headers }
      );
      console.log('✅ Cleared all training phrases');
    } catch (error) {
      console.error('Failed to clear training phrases:', error);
      throw error;
    }
  }

  async createTrainingCollection() {
    if (!this.enabled) return;
    try {
      await axios.put(`${this.baseURL}/collections/training_phrases`, {
        vectors: {
          size: 384,
          distance: 'Cosine',
        },
        on_disk_payload: true,
        payload_schema: {
          city: { type: 'keyword' },
          phrase: { type: 'text' },
          type: { type: 'keyword' },
        },
      }, { headers: this.headers });
  
      console.log('✅ Created "training_phrases" collection');
    } catch (err) {
      console.error('❌ Failed to create "training_phrases" collection:', err.response?.data || err.message);
    }
  }
  
}
