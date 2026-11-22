#!/bin/sh
set -eu

conf=/etc/nginx/conf.d/real-ip.conf
: > "$conf"

[ -z "${TRUSTED_PROXY:-}" ] && exit 0

for proxy in $TRUSTED_PROXY; do
    case "$proxy" in
        *[!0-9a-fA-F.:/]*) ;;
        *) echo "set_real_ip_from $proxy;" >> "$conf"; continue ;;
    esac

    # Hostname: wait until it resolves, since nginx refuses to start otherwise.
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

# Right-most address only: anything to its left came from the client.
echo "real_ip_header X-Forwarded-For;" >> "$conf"
echo "real_ip_recursive off;" >> "$conf"
echo "$0: trusting X-Forwarded-For from: $TRUSTED_PROXY"
