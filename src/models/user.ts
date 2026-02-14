import mongoose, { Schema, Document } from 'mongoose';
import {
  StakeholderStatus,
  DepartmentValue,
  STAKEHOLDER_STATUS,
  DEPARTMENT,
  UserRole,
  UserDesignation,
  DESIGNATION
} from '../constant';
import { ROLE } from '../constant/userInfo';

export interface User extends Document {
  userId: string;
  name: string;
  email: string;
  department: DepartmentValue;
  mobile: string;
  designation: UserDesignation;
  status: StakeholderStatus;
  password: string;
  role: UserRole;
  lastLogin?: Date;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<User>(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
    },

    role: {
      type: String,
      enum: ROLE.map((option) => option.value),
      default: 'faculty',
      required: true,
    },

    department: {
      type: String,
      enum: DEPARTMENT.map((option) => option.value),
      required: true,
    },

    mobile: {
      type: String,
      required: true,
      trim: true,
    },

    designation: {
      type: String,
      enum: DESIGNATION.map((option) => option.value),
      required: true,
      trim: true,
    },

    status: {
      type: String,
      enum: STAKEHOLDER_STATUS.map((option) => option.value),
      required: true,
      default: 'active',
    },

    lastLogin: {
      type: Date,
    },
    resetPasswordToken: {
      type: String,
    },
    resetPasswordExpires: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

export const User = mongoose.model<User>('User', userSchema);
