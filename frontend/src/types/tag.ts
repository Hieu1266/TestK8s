export interface TagCreate {
  tag_name: string;
  description?: string | null;
}

export interface TagUpdate {
  tag_id: string;
  tag_name?: string;
  description?: string | null;
}

export interface TagItem {
  tag_id: string;
  tag_name: string;
  description?: string | null;
}

export interface TagListQuery {
  skip?: number;
  limit?: number;
}

export interface TagName {
  tag_id: string;
  tag_name: string;
}
