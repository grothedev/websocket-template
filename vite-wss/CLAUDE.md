a websocket server with vite. 

a sample websocket server with basic message types to use as a showcase. 

there is a state that it publishes to clients, clients can query the state and publish their actions.

upon actions that change the state, the server publishes the state change so that clients can sync their local model. 

there is a development env config and production env config, with instructions for how to use and deploy both. 
