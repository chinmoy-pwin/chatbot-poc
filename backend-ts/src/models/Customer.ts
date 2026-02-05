import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface CustomerAttributes {
  id: string;
  name: string;
  webhook_url?: string;
  created_at?: Date;
  updated_at?: Date;
}

interface CustomerCreationAttributes extends Optional<CustomerAttributes, 'id' | 'created_at' | 'updated_at'> {}

class Customer extends Model<CustomerAttributes, CustomerCreationAttributes> implements CustomerAttributes {
  declare id: string;
  declare name: string;
  declare webhook_url?: string;
  declare readonly created_at: Date;
  declare readonly updated_at: Date;
}

Customer.init(
  {
    id: {
      type: DataTypes.STRING(36),
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    webhook_url: {
      type: DataTypes.STRING(512),
      allowNull: true
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
    tableName: 'customers',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
);

export default Customer;