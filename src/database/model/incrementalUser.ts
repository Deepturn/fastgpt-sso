import mongoose, { Schema } from 'mongoose';
import type { Document } from 'mongoose';

// 增量用户数据接口
export interface IncrementalUserData {
  username: string;
  memberName: string;
  avatar: string;
  contact: string;
  orgs: Array<string>;
}

export interface IIncrementalUser extends Document {
  username: string;
  memberName: string;
  avatar: string;
  contact: string;
  orgs: Array<string>;
  createdAt: Date;
  updatedAt: Date;
}

const IncrementalUserSchema: Schema = new Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    memberName: {
      type: String,
      required: true
    },
    avatar: {
      type: String,
      required: true
    },
    contact: {
      type: String,
      required: true
    },
    orgs: {
      type: [String],
      required: true,
      default: []
    }
  },
  {
    timestamps: true,
    collection: 'incremental_users'
  }
);

// 基础索引
IncrementalUserSchema.index({ username: 1 });
IncrementalUserSchema.index({ memberName: 1 });

export default mongoose.model<IIncrementalUser>('IncrementalUser', IncrementalUserSchema);
