import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import Customer from './Customer';

interface ScrapedContentAttributes {
  id: string;
  customer_id: string;
  url: string;
  content: string;
  status?: string;
  job_id?: string;
  processing_error?: string;
  scraped_at?: Date;
  updated_at?: Date;
}

interface ScrapedContentCreationAttributes extends Optional<ScrapedContentAttributes, 'id' | 'scraped_at' | 'updated_at'> {}

class ScrapedContent extends Model<ScrapedContentAttributes, ScrapedContentCreationAttributes> implements ScrapedContentAttributes {
  public id!: string;
  public customer_id!: string;
  public url!: string;
  public content!: string;
  public status?: string;
  public job_id?: string;
  public processing_error?: string;
  public readonly scraped_at!: Date;
  public readonly updated_at!: Date;
}

ScrapedContent.init(
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
    url: {
      type: DataTypes.STRING(1024),
      allowNull: false
    },
    content: {
      type: DataTypes.TEXT('medium'),
      allowNull: false
    },
    status: {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: 'pending'
    },
    job_id: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    processing_error: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    scraped_at: {
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
    tableName: 'scraped_contents',
    timestamps: true,
    createdAt: 'scraped_at',
    updatedAt: 'updated_at'
  }
);

// Associations
ScrapedContent.belongsTo(Customer, { foreignKey: 'customer_id' });
Customer.hasMany(ScrapedContent, { foreignKey: 'customer_id' });

export default ScrapedContent;