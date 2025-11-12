# StealthShare

Store your files fast and anonymously!

Advice: Never trust your hackathon friends.

## Retention Setup

```
mc mb --with-lock local/stealthshare
mc retention set --default compliance 1d local/stealthshare
mc retention info local/stealthshare
```