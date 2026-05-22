FROM node:22-alpine

WORKDIR /app

# Install deps first (better layer caching)
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci

# Generate Prisma client during image build so runtime doesn't depend on bind-mount artifacts
RUN npx prisma generate

# Copy the rest
COPY . .

EXPOSE 3001

CMD ["npm","run","start:dev"]
