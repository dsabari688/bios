export interface CreateDiaryEntryInput {
  date: string;
  timestamp?: string;
  content: string;
  review: string;
  mood: string;
  productivityScore: number;
}

export interface UpdateDiaryEntryInput {
  timestamp?: string;
  content?: string;
  review?: string;
  mood?: string;
  productivityScore?: number;
}
