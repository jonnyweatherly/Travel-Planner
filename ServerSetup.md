# Server Setup

## Local

```bash
cd "Travel-Planner" && python -m http.server 8000
cd Travel-Planner && timeout 3 python -m http.server 8000 || echo "Command timed out or failed"
```

## Server Kill Local
```
taskkill //F //PID 58892 && taskkill //F //PID 38500
```


## Browser
```
Open:
http://localhost:8000
```

## Remote

```bash
cd "Travel-Planner" && python -m http.server 8000
```
