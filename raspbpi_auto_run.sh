#!/bin/bash
NODE_PATH=/home/pi/node_setup/v0.10.24/node-v0.10.24-linux-arm-armv6j-vfp-hard/bin
SCRIPT_PATH=/home/pi/node-midi-websocket
LOG_PATH=/home/pi/logs

echo "Starting..." >> ${LOG_PATH}/floppy.log
date >> ${LOG_PATH}/floppy.log
${NODE_PATH}/node ${SCRIPT_PATH}/server.js >> ${LOG_PATH}/floppy.log 2>&1 &
echo $! > ${LOG_PATH}/node.pid
