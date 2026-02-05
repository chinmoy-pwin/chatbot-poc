import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import Customer from './Customer';

interface KnowledgeFileAttributes {
  id: string;
  customer_id: string;
  filename: string;
  file_type: string;
  content: string;
  uploaded_at?: Date;
  updated_at?: Date;
}

interface KnowledgeFileCreationAttributes extends Optional<KnowledgeFileAttributes, 'id' | 'uploaded_at' | 'updated_at'> {}

class KnowledgeFile extends Model<KnowledgeFileAttributes, KnowledgeFileCreationAttributes> implements KnowledgeFileAttributes {
  public id!: string;
  public customer_id!: string;
  public filename!: string;
  public file_type!: string;
  public content!: string;
  public readonly uploaded_at!: Date;
  public readonly updated_at!: Date;
}

KnowledgeFile.init(
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
    filename: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    file_type: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    content: {
      type: DataTypes.TEXT('medium'),
      allowNull: false
    },
    uploaded_at: {
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
    tableName: 'knowledge_files',
    timestamps: true,
    createdAt: 'uploaded_at',
    updatedAt: 'updated_at'
  }
);

// Associations
KnowledgeFile.belongsTo(Customer, { foreignKey: 'customer_id' });
Customer.hasMany(KnowledgeFile, { foreignKey: 'customer_id' });

export default KnowledgeFile;