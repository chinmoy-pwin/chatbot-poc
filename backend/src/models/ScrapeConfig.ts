import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import Customer from './Customer';

interface ScrapeConfigAttributes {
  id: string;
  customer_id: string;
  urls: string[];
  schedule: string;
  auto_scrape: boolean;
  created_at?: Date;
  updated_at?: Date;
}

interface ScrapeConfigCreationAttributes extends Optional<ScrapeConfigAttributes, 'id' | 'schedule' | 'auto_scrape' | 'created_at' | 'updated_at'> {}

class ScrapeConfig extends Model<ScrapeConfigAttributes, ScrapeConfigCreationAttributes> implements ScrapeConfigAttributes {
  public id!: string;
  public customer_id!: string;
  public urls!: string[];
  public schedule!: string;
  public auto_scrape!: boolean;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

ScrapeConfig.init(
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
    urls: {
      type: DataTypes.JSON,
      allowNull: false,
      get() {
        const value = this.getDataValue('urls');
        return Array.isArray(value) ? value : JSON.parse(value as any);
      }
    },
    schedule: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: '0 0 * * *'
    },
    auto_scrape: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
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
    tableName: 'scrape_configs',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
);

// Associations
ScrapeConfig.belongsTo(Customer, { foreignKey: 'customer_id' });
Customer.hasMany(ScrapeConfig, { foreignKey: 'customer_id' });

export default ScrapeConfig;