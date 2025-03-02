import Vue from 'vue'

/**
 * The WebSocketManager class that defines methods for WebSocket interaction.
 */
export default class WebSocketManager {
  url: string;
  emitter: Vue;
  reconnectInterval: number;
  ws?: WebSocket;

  /**
   * Constructor function for the WebSocketManager class.
   * Initializes properties and invokes connect method.
   *
   * @param {string} url The WebSocket URL to connect.
   * @param {number} reconnectInterval Time in ms to reconnect.
   * @returns {WebSocketManager} The WebSocketManager instance.
   */
  constructor (url: string, emitter: Vue, reconnectInterval: number) {
    this.url = url
    this.emitter = emitter
    this.reconnectInterval = reconnectInterval
  }

  /**
   * Establishes WebSocket connection.
   * Defines handlers for message, close and error events.
   *
   * @returns {void} Returns with no return value once the connection is established.
   */
  connect (): void {
    /* istanbul ignore next */
    this.reconnectInterval = this.reconnectInterval || 1000
    this.ws = new WebSocket(this.url)

    this.ws.onmessage = (message) => {
      try {
        const { event, data } = JSON.parse(message.data)
        this.emitter.$emit(event, data)
      } catch (err) {
        this.emitter.$emit('message', message)
      }
    }

    this.ws.onclose = (event) => {
      /* istanbul ignore next */
      if (event) {
        // 1000 is the normal close event.
        if (event.code !== 1000) {
          const maxReconnectInterval = 3000
          setTimeout(() => {
            // Reconnect interval can't be > x seconds.
            /* istanbul ignore next */
            if (this.reconnectInterval < maxReconnectInterval) {
              this.reconnectInterval += 1000
            }
            this.connect()
          }, this.reconnectInterval)
        }
      }
    }

    this.ws.onerror = (error): void => {
      // eslint-disable-next-line no-console
      console.error(error)
      this.ws?.close()
    }
  }

  /**
   * Ensures the WebSocket connection is open.
   *
   * @returns {Promise<void>} A promise that resolves with no return value straightaway if the WebSocket connection is open.
   * Or else, waits until the open event is fired.
   */
  ready (): Promise<void> {
    return new Promise<void>((resolve) => {
      if (this.ws?.readyState !== this.ws?.OPEN) {
        this.ws!.onopen = () => {
          this.reconnectInterval = 1000
          resolve()
        }
      } else {
        resolve()
      }
    })
  }

  /**
   * Waits for the WebSocket connection to be open if not already and transmits the data received.
   *
   * @param {string | Record<string, unknown>} message The data to be transmitted.
   * @returns {Promise<void>} A promise that resolves with no return value on transmitting the data.
   */
  async send (message: string | Record<string, unknown>): Promise<void> {
    await this.ready()
    const parsedMessage = typeof message === 'string' ? message : JSON.stringify(message)
    return this.ws?.send(parsedMessage)
  }

  /**
   * Closes the WebSocket connection.
   *
   * @param {number | undefined} [code] The connection close code.
   * @param {string | undefined} [reason] The connection close reason.
   * @returns {void} Returns with no return value once the connection is closed.
   */
  close (code?: number | undefined, reason?: string | undefined): void {
    if (this.ws) {
      this.ws.close(code, reason)
    }
  }
}
