#!/bin/sh
# Runs from the nginx image's entrypoint (/docker-entrypoint.d) before nginx starts.
#
# Decides whose X-Forwarded-For header nginx believes. By default nobody's: nginx is the first
# hop, $remote_addr is the real client, and any X-Forwarded-For a client sends is ignored.
#
# With the optional HTTPS proxy (Caddy) in front, every request arrives from Caddy, so compose
# sets TRUSTED_PROXY=caddy. nginx then takes the client IP from Caddy's X-Forwarded-For, but only
# for connections that really come from that address. Values are space-separated hostnames,
# IPs or CIDR ranges.
set -eu

conf=/etc/nginx/conf.d/real-ip.conf
: > "$conf"

[ -z "${TRUSTED_PROXY:-}" ] && exit 0

for proxy in $TRUSTED_PROXY; do
    case "$proxy" in
        # Looks like an IPv4/IPv6 address or CIDR: no lookup needed.
        *[!0-9a-fA-F.:/]*) ;;
        *) echo "set_real_ip_from $proxy;" >> "$conf"; continue ;;
    esac

    # A hostname. nginx resolves it once at startup and refuses to start if it can't, so wait
    # briefly in case the proxy container is still starting. getent goes through the same system
    # resolver nginx uses (busybox nslookup doesn't, and can succeed before nginx would).
    tries=0
    until getent hosts "$proxy" > /dev/null 2>&1; do
        tries=$((tries + 1))
        if [ "$tries" -ge 30 ]; then
            echo "$0: trusted proxy '$proxy' did not resolve after 30s" >&2
            exit 1
        fi
        sleep 1
    done
    echo "set_real_ip_from $proxy;" >> "$conf"
done

# Use the right-most address only (recursive off): Caddy appends the client it saw, and anything
# to its left came from the client and can't be trusted.
echo "real_ip_header X-Forwarded-For;" >> "$conf"
echo "real_ip_recursive off;" >> "$conf"
echo "$0: trusting X-Forwarded-For from: $TRUSTED_PROXY"
