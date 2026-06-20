const mongoose = require('mongoose');

const TicketSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  channelId: { type: String, required: true, unique: true },
  userId: { type: String, required: true }, // User who created the ticket
  ticketNumber: { type: Number, required: true },
  status: { type: String, enum: ['open', 'claimed', 'closed'], default: 'open' },
  category: { type: String, required: true }, // support, report, partnership, purchase, staff
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  claimedBy: { type: String, default: null }, // Staff member ID
  closedBy: { type: String, default: null }, // User ID who closed the ticket
  createdAt: { type: Date, default: Date.now },
  closedAt: { type: Date, default: null },
  transcriptData: [{
    author: { type: String, required: true },
    authorId: { type: String, required: true },
    content: { type: String, default: '' },
    timestamp: { type: Date, default: Date.now },
    attachments: { type: [String], default: [] } // URLs of attachments
  }]
});

module.exports = mongoose.model('Ticket', TicketSchema);
