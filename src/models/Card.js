const mongoose = require('mongoose');

const cardSchema = new mongoose.Schema(
  {
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: [true, 'Account ID is required'],
      index: true,
    },
    last4: {
      type: String,
      required: [true, 'Card last 4 digits are required'],
      trim: true,
      minlength: 4,
      maxlength: 4,
    },
    status: {
      type: String,
      enum: {
        values: ['ACTIVE', 'BLOCKED'],
        message: '{VALUE} is not a valid card status',
      },
      default: 'ACTIVE',
      index: true,
    },
    blockedAt: {
      type: Date,
      default: null,
    },
    blockReason: {
      type: String,
      default: null,
      trim: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

const Card = mongoose.model('Card', cardSchema);

module.exports = Card;
