import mongoose, { Schema, Document } from 'mongoose';
import { DepartmentValue, DEPARTMENT } from '../constant';

export interface InteractionDean extends Document {
  department: DepartmentValue;
  deanIds: string[];
  createdAt: Date;
  updatedAt: Date;
}

const interactionDeanSchema = new Schema<InteractionDean>(
  {
    department: {
      type: String,
      enum: DEPARTMENT.map((option) => option.value),
      required: true,
      unique: true,
    },
    deanIds: [
      {
        type: String,
        required: true,
      },
    ],
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<InteractionDean>('InteractionDean', interactionDeanSchema);
