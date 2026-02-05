import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import Customer from './Customer';

interface ConversationAttributes {
  id: string;
  customer_id: string;
  session_id: string;
  created_at?: Date;
  updated_at?: Date;
}

interface ConversationCreationAttributes extends Optional<ConversationAttributes, 'id' | 'created_at' | 'updated_at'> {}

class Conversation extends Model<ConversationAttributes, ConversationCreationAttributes> implements ConversationAttributes {
  public id!: string;
  public customer_id!: string;
  public session_id!: string;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

Conversation.init(
  {
    id: {
      type: DataTypes.STRING(36),
      primaryKey: true
    },
    customer_id: {
      type: DataTypes.STRING(36),
      allowNull: false,
      references: {
        model: 'customers',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    session_id: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  },
  {
    sequelize,
    tableName: 'conversations',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
);

// Associations
Conversation.belongsTo(Customer, { foreignKey: 'customer_id' });
Customer.hasMany(Conversation, { foreignKey: 'customer_id' });

export default Conversation;