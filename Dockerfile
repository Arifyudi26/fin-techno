# Step 1: Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package.json dan install semua dependencies (termasuk devDependencies)
COPY package*.json ./

RUN npm install

# Copy semua file ke dalam container
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build aplikasi
RUN npm run build

# Step 2: Run stage
FROM node:18-alpine

WORKDIR /app

# Copy hasil build dari tahap builder
COPY --from=builder /app /app

# Install dependencies produksi saja
RUN npm install --production

# Jalankan migrasi database (opsional)
RUN npx prisma migrate deploy

# Expose port 3000
EXPOSE 3000

# Jalankan aplikasi
CMD ["npm", "run", "start"]
