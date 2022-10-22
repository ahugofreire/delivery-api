import { Inject, OnModuleInit } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Producer } from 'kafkajs';
import { Socket, Server } from 'socket.io';

@WebSocketGateway() //3000 - http - handshake
export class RoutesGateway  implements OnModuleInit {
  private kafkaProducer: Producer;
  @WebSocketServer()
  server: Server;

  constructor(
    @Inject('KAFKA_SERVICE')
    private kafkaClient: ClientKafka
  ) {}

  async onModuleInit() {
    this.kafkaProducer = await this.kafkaClient.connect();
  }

  @SubscribeMessage('new-direction')
  handleMessage(client: Socket, payload: { routeId: string}) {
    this.kafkaProducer.send({
      topic: 'route.new-direction',
      messages: [
        {
          key: 'route.new-direction',
          value: JSON.stringify({routeId: payload.routeId, clientId: client.id}),
        },
      ],
    });
   console.log(payload)
  }

  sendPosition(data: {
    routeId: String;
    clientId: string;
    position: [Number, Number]
    finished: Boolean;
  }) {
    const { clientId, ...rest } = data;
    const clients = this.server.sockets.connected;
    if (!(clientId in clients)) {
      console.error(
        'Client not exists, refresh React Application and resend new directions again.'
      );
      return;
    }
    clients[clientId].emit('new-position', rest);
  }
}
