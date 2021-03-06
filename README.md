<img src="https://raw.githubusercontent.com/delta-db/deltadb-server/master/deltadb.png" alt="DeltaDB" width="50" height="50" /> DeltaDB [![Build Status](https://travis-ci.org/delta-db/deltadb-server.svg)](https://travis-ci.org/delta-db/deltadb-server)
===

DeltaDB is a Front-end-Only Offline-First (FOOF) database designed to talk directly to clients and works great offline and online.


Status
---

DeltaDB is currently available as a prototype release. The core engine is functioning well and demonstrates offline capabilities for creating users, roles, policies, databases, collections and docs. The wrapping RESTful API has yet to be written, but will be written shortly. The short term goal is to be an open source Firebase that works offline.


Main Principles
---

* Written in JavaScript
* Works the same whether the client is offline or online
* NoSQL database that works in your browser and automatically syncs with the database cluster
* Stores all data as a series of deltas, which allows for smooth collaborative experiences even in frequently offline scenarios.
* Uses a simple last-write-wins conflict resolution policy and is eventually consistent
* Uses a homegrown ORM to speak to underlying SQL databases. (Support for underlying NoSQL databases will be added)
* Is fast. Clients push their deltas on to the server's queue. The server processes the queue separately and partitions the data so that clients can retrieve all recent changes very quickly.
* Implements a granular authentication system that protects databases, collections, docs and attributes
* Is incredibly scalable. Deltas can be segmented by UUID and the cost to add new nodes has a negligible impact on the cluster as handshaking between servers can be done as frequently as desired.
* Highly available. Clients can switch to talk to any node, even if that node hasn't received the latest deltas from another node.
* Fault tolerant by using the concept of a quorum of servers for recording changes
* Data is auto-restored when a client modifies data that was previously deleted
* Uses timestamps to update records so that transactions and their overhead can be avoided
* Thread-safe so that adding more cores will speed up DB reads and writes


Why?
---

Because it doesn't exist and true support for offline environments needs to be engineered from the ground up
- PouchDB relies on CouchDB and CouchDB is slow to replicate when there are many revisions and it is not optimized for offline setups like db-per-user
- Firebase doesn't work offline and is not open source
- Meteor doesn't work offline
- See [Inspiration](INSPIRATION.md) for more info


[Installation](INSTALL.md)
---


[API](https://github.com/delta-db/deltadb-server/wiki)
---


[To Do](TODO.md)
---


[Contributing](CONTRIBUTING.md)
---


[Notes](NOTES.md)
---


[Issues](ISSUES.md)
---


[Ideas](IDEAS.md)
---

