-- DropForeignKey
ALTER TABLE `Message` DROP FOREIGN KEY `Message_roomId_fkey`;

-- DropForeignKey
ALTER TABLE `Message` DROP FOREIGN KEY `Message_senderId_fkey`;

-- DropForeignKey
ALTER TABLE `MessageReceipt` DROP FOREIGN KEY `MessageReceipt_messageId_fkey`;

-- DropForeignKey
ALTER TABLE `MessageReceipt` DROP FOREIGN KEY `MessageReceipt_userId_fkey`;

-- DropForeignKey
ALTER TABLE `Room` DROP FOREIGN KEY `Room_createdById_fkey`;

-- DropForeignKey
ALTER TABLE `RoomMember` DROP FOREIGN KEY `RoomMember_roomId_fkey`;

-- DropForeignKey
ALTER TABLE `RoomMember` DROP FOREIGN KEY `RoomMember_userId_fkey`;
