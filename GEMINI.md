# Directory Overview

This directory contains planning materials for a **Node.js ETL (Extract, Transform, Load) project**. The primary goal is to migrate data from legacy HIS (Hospital Information System) databases used in Taiwanese clinics to a modern PostgreSQL database. The process involves converting various source formats (like DBF, Access, fixed-width TXT) into standardized formats (JSON, CSV, XML) before loading them into PostgreSQL.

The project is designed to be modular, allowing for the future addition of new data loaders and transformers. It also includes a mechanism for incremental updates by tracking the timestamp of the last data conversion.

# Key Files

*   `missionprocess0828.md`: This is the core planning document. It outlines the complete project structure, including the directory layout, required Node.js dependencies (`package.json`), configuration settings, and provides code snippets for key modules. These modules handle database connections (PostgreSQL), state management for incremental updates, data loading (e.g., from DBF files), and data transformation.
*   `台灣基層診所常見 HIS 系統廠商概況.docx`: (Unable to read content) Based on the title ("Overview of Common HIS System Vendors in Taiwanese Primary Care Clinics"), this document likely contains research and background information on the different HIS systems the ETL project will need to support.

# Development Plan

The project is planned but not yet implemented. Based on `missionprocess0828.md`, the development workflow would be:

1.  **Setup:** Create the directory structure and initialize a Node.js project with `npm init`.
2.  **Dependencies:** Install the dependencies listed in the `package.json` section of the markdown file using `npm install`.
3.  **Implementation:** Create the JavaScript files (`.js`) for each module as described in the plan (e.g., `index.js`, `config.js`, `postgresService.js`).
4.  **Execution:** Run the main script to start the ETL process using the command:
    ```bash
    node src/index.js
    ```
