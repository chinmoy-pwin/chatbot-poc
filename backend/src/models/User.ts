import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import bcrypt from 'bcryptjs';
import Customer from './Customer';

interface UserAttributes {
  id: string;
  email: string;
  password: string;
  name: string;
  role: 'admin' | 'customer';
  customer_id?: string;
  created_at?: Date;
  updated_at?: Date;
}

interface UserCreationAttributes extends Optional<UserAttributes, 'id' | 'customer_id' | 'created_at' | 'updated_at'> {}

class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  declare id: string;
  declare email: string;
  declare password: string;
  declare name: string;
  declare role: 'admin' | 'customer';
  declare customer_id?: string;
  declare readonly created_at: Date;
  declare readonly updated_at: Date;

  // Instance method to check password
  async comparePassword(candidatePassword: string): Promise<boolean> {
    return bcrypt.compare(candidatePassword, this.password);
  }

  // Instance method to get safe user data (without password)
  toSafeJSON() {
    return {
      id: this.id,
      email: this.email,
      name: this.name,
      role: this.role,
      customer_id: this.customer_id,
      created_at: this.created_at
    };
  }
}

User.init(
  {
    id: {
      type: DataTypes.STRING(36),
      primaryKey: true
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    role: {
      type: DataTypes.ENUM('admin', 'customer'),
      allowNull: false,
      defaultValue: 'customer'
    },
    customer_id: {
      type: DataTypes.STRING(36),
      allowNull: true,
      references: {
        model: 'customers',
        key: 'id'
      },
      onDelete: 'CASCADE'
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
    tableName: 'users',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    hooks: {
      beforeCreate: async (user: User) => {
        if (user.password) {
          const salt = await bcrypt.genSalt(10);
          user.password = await bcrypt.hash(user.password, salt);
        }
      },
      beforeUpdate: async (user: User) => {
        if (user.changed('password')) {
          const salt = await bcrypt.genSalt(10);
          user.password = await bcrypt.hash(user.password, salt);
        }
      }
    }
  }
);

// Associations
User.belongsTo(Customer, { foreignKey: 'customer_id', as: 'customer' });
Customer.hasMany(User, { foreignKey: 'customer_id', as: 'users' });

export default User;