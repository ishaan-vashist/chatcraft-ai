import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { cryptoService } from '../domain/crypto/crypto.service';

const prisma = new PrismaClient();

/**
 * Seed the database with initial data
 */
async function main() {
  console.log('Seeding database...');

  try {
    // Create users
    console.log('Creating users...');
    
    // User A
    const userA = await prisma.user.upsert({
      where: { email: 'user.a@example.com' },
      update: {},
      create: {
        email: 'user.a@example.com',
        name: 'User A',
        passwordHash: await bcrypt.hash('password123', 10),
      },
    });
    
    // User B
    const userB = await prisma.user.upsert({
      where: { email: 'user.b@example.com' },
      update: {},
      create: {
        email: 'user.b@example.com',
        name: 'User B',
        passwordHash: await bcrypt.hash('password123', 10),
      },
    });
    
    // AI User
    const aiUser = await prisma.user.upsert({
      where: { email: 'ai@relatim.com' },
      update: {},
      create: {
        email: 'ai@relatim.com',
        name: 'Relatim AI',
        passwordHash: await bcrypt.hash(Math.random().toString(36), 10),
      },
    });
    
    console.log('Users created successfully');
    
    // Create conversations
    console.log('Creating conversations...');
    
    // User A and User B conversation
    const conversationAB = await prisma.conversation.create({
      data: {
        isGroup: false,
        participants: {
          create: [
            { userId: userA.id },
            { userId: userB.id },
          ],
        },
      },
    });
    
    // User A and AI conversation
    const conversationAAI = await prisma.conversation.create({
      data: {
        isGroup: false,
        participants: {
          create: [
            { userId: userA.id },
            { userId: aiUser.id },
          ],
        },
      },
    });
    
    console.log('Conversations created successfully');
    
    // Create messages
    console.log('Creating messages...');
    
    // Messages between User A and User B
    const messageAB1 = await createMessage(
      conversationAB.id,
      userA.id,
      'Hey there! How are you doing?'
    );
    
    const messageAB2 = await createMessage(
      conversationAB.id,
      userB.id,
      'I\'m doing great! Just checking out this new chat app.'
    );
    
    const messageAB3 = await createMessage(
      conversationAB.id,
      userA.id,
      'Yeah, it\'s pretty cool. I like the real-time messaging.'
    );
    
    // Messages between User A and AI
    const messageAAI1 = await createMessage(
      conversationAAI.id,
      userA.id,
      'Hello AI, can you help me with something?'
    );
    
    const messageAAI2 = await createMessage(
      conversationAAI.id,
      aiUser.id,
      'Hi there! I\'m Relatim AI, your helpful assistant. What can I help you with today?'
    );
    
    console.log('Messages created successfully');
    
    console.log('Database seeded successfully');
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Helper function to create a message with encrypted content
 */
async function createMessage(conversationId: string, senderId: string, content: string) {
  // Encrypt message content
  const { ciphertext, nonce } = cryptoService.encrypt(content);
  
  // Create message
  return prisma.message.create({
    data: {
      conversationId,
      senderId,
      type: 'text',
      ciphertext,
      nonce,
    },
  });
}

// Execute the seed function
main()
  .then(() => {
    console.log('Seed completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  });
