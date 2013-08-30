#!/usr/bin/make -f

all:
	npm install --production
	
install:
	mkdir -p $(DESTDIR)/usr/lib/node_modules/mediainfo
	cp -a lib node_modules package.json $(DESTDIR)/usr/lib/node_modules/mediainfo