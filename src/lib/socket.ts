import { Server } from 'socket.io';
import { setSocketIO } from './notifications';

export const setupSocket = (io: Server) => {
  // Set Socket.IO instance for notifications
  setSocketIO(io);

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    
    // Join user's personal room for notifications
    socket.on('join-user', (userId: string) => {
      socket.join(`user-${userId}`);
      console.log(`Client ${socket.id} joined user room: user-${userId}`);
    });

    // Join case room
    socket.on('join-case', (caseId: string) => {
      socket.join(`case-${caseId}`);
      console.log(`Client ${socket.id} joined case room: case-${caseId}`);
    });

    // Join support room (for visitors)
    socket.on('join-support', (visitorId: string) => {
      socket.join(`support-${visitorId}`);
      console.log(`Client ${socket.id} joined support room: support-${visitorId}`);
    });

    // Join support staff room (for staff members)
    socket.on('join-support-staff', () => {
      socket.join('support-staff');
      console.log(`Client ${socket.id} joined support staff room`);
    });

    // Join application room (for client-staff messaging)
    socket.on('join-application', (applicationId: string) => {
      socket.join(`application-${applicationId}`);
      console.log(`Client ${socket.id} joined application room: application-${applicationId}`);
    });

    // Handle chat messages with acknowledgment
    socket.on('send-message', (message: any, callback?: (response: any) => void) => {
      // Broadcast to application room if applicationId exists
      if (message.applicationId) {
        io.to(`application-${message.applicationId}`).emit('new-message', message);
      }
      // Broadcast to case room if caseId exists
      else if (message.caseId) {
        io.to(`case-${message.caseId}`).emit('new-message', message);
      } 
      // Fallback to all
      else {
        io.emit('new-message', message);
      }

      // Send delivery acknowledgment
      if (callback) {
        callback({
          success: true,
          messageId: message.id,
          deliveredAt: Date.now(),
        });
      }
    });

    // Handle typing indicator
    socket.on('typing', (data: { caseId: string; userName: string }) => {
      socket.to(`case-${data.caseId}`).emit('user-typing', {
        userName: data.userName,
      });
    });

    // Handle stop typing
    socket.on('stop-typing', (data: { caseId: string }) => {
      socket.to(`case-${data.caseId}`).emit('user-stop-typing');
    });

    // Handle support messages with acknowledgment
    socket.on('support-message', (message: any, callback?: (response: any) => void) => {
      // Broadcast to specific visitor room
      if (message.visitorId) {
        io.to(`support-${message.visitorId}`).emit('support-message', message);
      }
      
      // Also broadcast to support staff room
      io.to('support-staff').emit('support-message', message);

      // Send acknowledgment back to sender
      if (callback) {
        callback({
          success: true,
          messageId: message.id,
          timestamp: Date.now(),
        });
      }
    });

    // Handle message status updates
    socket.on('update-message-status', (data: { messageId: string; status: string; messageType: 'support' | 'application' }) => {
      
      if (data.messageType === 'support') {
        io.to('support-staff').emit('message-status-updated', data);
      } else if (data.messageType === 'application') {
        // Broadcast status update to all in the application room
        socket.broadcast.emit('message-status-updated', data);
      }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });
};