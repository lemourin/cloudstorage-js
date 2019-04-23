"use-strict"

import { CloudFactory } from './cloudstorage'

Module.onRuntimeInitialized = async _ => {
    const factory = new CloudFactory();
    document.getElementById("providers").textContent = factory.availableProviders();
    
    const access = factory.createAccess("google", "");
    const page = await access.listDirectoryPage(access.root(), "");
  
    document.getElementById("content").textContent = 
      page.items.reduce((accumulator, current) => accumulator + "\n" + current.filename(), "");
    document.getElementById("url").textContent = factory.authorizeUrl("google");
    
    page.destroy();
    access.destroy();
    factory.destroy();
  }
  