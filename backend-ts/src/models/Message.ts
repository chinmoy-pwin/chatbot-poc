import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import Conversation from './Conversation';

interface MessageAttributes {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at?: Date;
}

interface MessageCreationAttributes extends Optional<MessageAttributes, 'id' | 'created_at'> {}

class Message extends Model<MessageAttributes, MessageCreationAttributes> implements MessageAttributes {
  public id!: string;
  public conversation_id!: string;
  public role!: 'user' | 'assistant';
  public content!: string;
  public readonly created_at!: Date;
}

Message.init(
  {
    id: {
      type: DataTypes.STRING(36),
      primaryKey: true
    },
    conversation_id: {
      type: DataTypes.STRING(36),
      allowNull: false,
      references: {
        model: 'conversations',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    role: {
      type: DataTypes.ENUM('user', 'assistant'),
      allowNull: false
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  },
  {
    sequelize,
    tableName: 'messages',
    timestamps: false,
    createdAt: 'created_at',
    updatedAt: false
  }
);

// Associations
Message.belongsTo(Conversation, { foreignKey: 'conversation_id' });
Conversation.hasMany(Message, { foreignKey: 'conversation_id' });

export default Message;