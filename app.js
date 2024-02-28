const { Server } = require("socket.io");

const io = new Server(3000, {
    cors: {
        origin: "http://localhost:8081",
        methods: ["GET", "POST"]
    }
});

io.on("connection", (socket) => {
    console.log("Socket " + socket.id + " connected");

    socket.on("disconnect", () => {
        const requests = io.sockets.adapter.rooms.get("req-" + socket.id);
        if (requests) {
            for (const id of requests) {
                const otherSocket = io.sockets.sockets.get(id);
                if (otherSocket) {
                    otherSocket.leave("req-" + socket.id);
                    otherSocket.emit("connectionRejected", { message: "Client disconnected" });
                }
            }
        }
        const connections = io.sockets.adapter.rooms.get(socket.id);
        if (connections) {
            for (const id of connections) {
                const otherSocket = io.sockets.sockets.get(id);
                if (otherSocket) {
                    otherSocket.leave(socket.id);
                    otherSocket.emit("connectionRejected", { message: "Client disconnected" });
                }
            }
        }
        console.log("Socket " + socket.id + " disconnected");
    });

    socket.on("createConnection", (data) => {
        const otherSocket = io.sockets.sockets.get(data.id);
        console.log("Socket " + socket.id + " wants to connect to " + data.id);
        if (otherSocket && otherSocket.rooms.size === 1) {
            io.to(data.id).emit("connectionRequest", { id: socket.id });
            socket.emit("connectionRequested", { id: data.id });
            socket.join("req-" + data.id);
            console.log("Socket " + socket.id + " requested to connect to " + data.id);
        }
        else {
            console.log("Socket " + data.id + " is not available");
            socket.emit("connectionRejected", { message: "Socket does not exist or is busy" });
        }
    });

    socket.on("acceptConnection", (data) => {
        const otherSocket = io.sockets.sockets.get(data.id);
        if (!otherSocket) {
            console.log("Socket " + data.id + " does not exist");
            return;
        }
        if (otherSocket.rooms.has("req-" + socket.id)) {
            otherSocket.join(socket.id);
            otherSocket.leave("req-" + socket.id);
            socket.join(data.id);
            socket.emit("connectionCreated", { id: data.id });
            otherSocket.emit("connectionCreated", { id: socket.id });
            console.log("Socket " + socket.id + " accepted connection to " + data.id);
        }
        else {
            console.log("Socket " + socket.id + " is not authorized to connect to " + data.id);
        }
    });

    socket.on("rejectConnection", (data) => {
        const otherSocket = io.sockets.sockets.get(data.id);
        if (!otherSocket) {
            console.log("Socket " + data.id + " does not exist");
            return;
        }
        if (otherSocket.rooms.has("req-" + socket.id)) {
            otherSocket.leave("req-" + socket.id);
            otherSocket.emit("connectionRejected", { message: "Connection rejected" });
            console.log("Socket " + socket.id + " rejected connection to " + data.id);
        }
        else {
            console.log("Socket " + socket.id + " is not authorized to connect to " + data.id);
        }
    });

    socket.on("location", (data) => {
        const otherSocket = io.sockets.sockets.get(data.id);
        if (otherSocket && otherSocket.rooms.has(socket.id) && socket.rooms.has(data.id)) {
            otherSocket.emit("location", { id: socket.id, location: data.location });
        }
    });
});