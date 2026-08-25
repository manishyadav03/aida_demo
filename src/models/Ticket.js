const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema(
  {
    ticketNumber: {
      type: String,
      required: [true, 'Ticket number is required'],
      unique: true,
      trim: true,
      index: true,
    },
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: [true, 'Account ID is required'],
      index: true,
    },
    cardId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Card',
      index: true,
    },
    type: {
      type: String,
      enum: {
        values: ['CARD_BLOCK'],
        message: '{VALUE} is not a valid ticket type',
      },
      default: 'CARD_BLOCK',
    },
    reason: {
      type: String,
      default: 'User requested card block',
      trim: true,
    },
    status: {
      type: String,
      enum: {
        values: ['SUCCESS', 'FAILED'],
        message: '{VALUE} is not a valid ticket status',
      },
      default: 'SUCCESS',
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

const Ticket = mongoose.model('Ticket', ticketSchema);

module.exports = Ticket;
