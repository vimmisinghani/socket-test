var mongoose = require('mongoose');
const UserSchema = new mongoose.Schema(
	{
		userId: String,
		name: {
			type: String,
			trim: true
		},
		socketId: [String]
	},
	{ collection: 'users', versionKey: false }
);
module.exports = mongoose.model('users', UserSchema);