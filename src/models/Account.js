const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const accountSchema = new mongoose.Schema(
  {
    accountNumber: {
      type: String,
      required: [true, 'Account number is required'],
      unique: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Account holder name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    pin: {
      type: String,
      required: [true, 'PIN is required'],
      select: false, // Prevent PIN from being returned in standard queries
    },
    balance: {
      type: Number,
      default: 0,
      min: [0, 'Balance cannot be negative'],
    },
    lastAction: {
      type: String,
      default: null,
    },
    lastTicketNumber: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        delete ret.pin;
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      transform(doc, ret) {
        delete ret.pin;
        delete ret.__v;
        return ret;
      },
    },
  }
);

/**
 * Pre-save hook to hash the PIN before saving to the database.
 */
accountSchema.pre('save', async function (next) {
  if (!this.isModified('pin')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.pin = await bcrypt.hash(this.pin, salt);
  next();
});

/**
 * Compare plain text candidate PIN with hashed PIN.
 * @param {string} candidatePin
 * @returns {Promise<boolean>}
 */
accountSchema.methods.comparePin = async function (candidatePin) {
  if (!this.pin) {
    return false;
  }
  return bcrypt.compare(candidatePin, this.pin);
};

const Account = mongoose.model('Account', accountSchema);

module.exports = Account;
