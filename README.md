# DriveSafe AI – Smart Vehicle Monitoring Dashboard

A smart vehicle monitoring project combining a web dashboard with ESP32-based embedded firmware for vehicle and driver-behaviour monitoring.

## Overview

DriveSafe AI is designed to demonstrate how embedded systems and a web interface can support vehicle monitoring and safety-related alerts.

The repository contains the dashboard application and ESP32 firmware source code.

## Features

- Vehicle monitoring dashboard interface
- ESP32 firmware for embedded monitoring
- Sensor-based monitoring and event handling
- Visual display of monitoring information
- Hardware and software integration

*Features depend on the firmware and dashboard functionality implemented in the current version.*

## Technology Stack

- **Embedded:** ESP32, Arduino framework
- **Firmware language:** C/C++
- **Frontend:** React, TypeScript, Vite
- **Configuration:** Firebase-related configuration files

## Repository Structure

```text
DriveSafe-AI-Dashboard/
└── smart-vehicle-monitoring-dashboard/
    ├── src/
    │   └── esp32/
    │       └── drivesafe_v2.1/
    │           └── drivesafe_v2.1.ino
    ├── package.json
    ├── index.html
    └── README.md
```

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/vijayadhitya18-ops/DriveSafe-AI-Dashboard.git
cd DriveSafe-AI-Dashboard/smart-vehicle-monitoring-dashboard
```

### 2. Install dependencies

Install Node.js and npm, then run:

```bash
npm install
```

### 3. Start the dashboard

```bash
npm run dev
```

Open the local URL printed in your terminal.

### 4. ESP32 Firmware

Open `src/esp32/drivesafe_v2.1/drivesafe_v2.1.ino` using the Arduino IDE, configure the required board and libraries, and upload the firmware to a compatible ESP32 board.

Check the firmware source for the actual sensor connections and library requirements before uploading.

## Project Goals

- Develop practical embedded firmware skills.
- Explore integration between microcontroller-based systems and web dashboards.
- Build a foundation for vehicle-monitoring and driver-safety applications.

## Author

**Vijay Adhitya**

- GitHub: [vijayadhitya18-ops](https://github.com/vijayadhitya18-ops)
- Project repository: [DriveSafe-AI-Dashboard](https://github.com/vijayadhitya18-ops/DriveSafe-AI-Dashboard)

---

*This project is intended for educational and development purposes. Do not rely on it as a certified automotive safety system.*
