// Copyright (c) engageLively
// Distributed under the terms of the Modified BSD License.

import {
  Kernel,
  KernelMessage,
  SessionManager,
  Session
} from '@jupyterlab/services';
import { GalyleoEditor } from './editor';

/**
 * A pair, kernel connection and communications channel,
 */

class CommChannel {
  public model: Session.IModel;
  public connection: Kernel.IKernelConnection | undefined;
  public comm: Kernel.IComm | undefined;
  constructor(model: Session.IModel, manager: SessionManager) {
    this.model = model;
    this.connection = manager
      .connectTo({ model })
      .kernel?.clone({ handleComms: true });
  }
}
/**
 * A communications plugin for a Kernel.  Everytime a Notebook is fired up, this creates a
 * classic Comm channel with a target "galyleo_data" for the kernel.  Once the message is
 * received, it finds the right dashboard to send it to
 **/

export class GalyleoCommunicationsManager {
  private _manager: SessionManager;
  private _studios: Array<GalyleoEditor>;
  private _channels: Array<CommChannel>;
  constructor(sessionManager: SessionManager) {
    this._manager = sessionManager;
    this._studios = [];
    this._channels = [];
    this._updateConnections();
    this._manager.runningChanged.connect(manager => {
      this._updateConnections();
    }, this);
  }

  private _updateConnections() {
    const runningSessions = this._manager.running();
    let model: Session.IModel | undefined;
    const models: Array<Session.IModel> = this._channels.map(
      channel => channel.model
    );
    while ((model = runningSessions.next())) {
      if (models.indexOf(<Session.IModel>model) < 0) {
        const channel = new CommChannel(model, this._manager);
        this._channels.push(channel);
        this._initConnection(channel);
      }
    }
  }

  private _initConnection(channel: CommChannel) {
    channel.connection?.connectionStatusChanged.connect(
      (kernelConnection, connectionStatus) => {
        this._checkOpenComm(channel, connectionStatus);
      },
      this
    );
    if (channel.connection)
      this._checkOpenComm(channel, channel.connection.connectionStatus);
  }

  private _checkOpenComm(
    channel: CommChannel,
    status: Kernel.ConnectionStatus
  ) {
    if (status == 'connected') {
      channel.comm = channel.connection?.createComm('galyleo_data');
      const self = this;
      channel.connection?.registerCommTarget(
        'galyleo_data',
        (comm: Kernel.IComm, msg: KernelMessage.ICommOpenMsg) => {
          // have to inline this because nitwit typescript doesn't carry this!
          // comm.onMsg = self._handleGalyleo;
          comm.onMsg = (msg: KernelMessage.ICommMsgMsg) => {
            const data = msg.content.data;
            if (data['name'] && data['table']) {
              self._studios.forEach(studio => studio.loadTable(data));
            }
          };
        }
      );
      // const self:GalyleoCommunicationsManager = this; // just to make sure we have a handle on this
      // if (channel.comm) channel.comm.onMsg = (msg:KernelMessage.ICommMsgMsg) => self._handleGalyleo(msg)
    }
  }

  public _handleGalyleoOpen(
    comm: Kernel.IComm,
    msg: KernelMessage.ICommOpenMsg
  ) {
    comm.onMsg = this._handleGalyleo;
  }

  public addEditor(editor: GalyleoEditor) {
    this._studios.push(editor);
  }

  public _handleGalyleo(msg: KernelMessage.ICommMsgMsg) {
    const data = msg.content.data;
    if (data['name'] && data['table']) {
      this._studios.forEach(studio => studio.loadTable(data));
    }
  }
}
