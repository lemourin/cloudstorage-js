import * as React from "react";

import { CloudFactory } from "../cloudstorage";
import { List, ListItem } from "react-toolbox/lib/list";
import { Link } from 'react-router-dom'

interface AddAccountProps {
    factory: CloudFactory
};

export class AddAccount extends React.Component<AddAccountProps, {}> {
    patchUrl = (url: string) => {
        const m = url.match(`^${process.env.HOSTNAME}/([^/]*)/login(.*)$`);
        if (m)
            return `/auth/${m![1]}`;
        else
            return url;
    }

    render() {
        return <List>
            {this.props.factory.availableProviders().map((value, _) => {
                const url = this.props.factory.authorizeUrl(value, {
                    redirectUri: process.env.HOSTNAME,
                    state: value
                });
                if (url.match(`^${process.env.HOSTNAME}.*$`))
                    return <Link key={`${value}-internal`} to={this.patchUrl(url)}>
                        <ListItem caption={value} />
                    </Link>
                else
                    return <a key={`${value}-external`} href={this.patchUrl(url)}>
                        <ListItem caption={value} />
                    </a>;
            })}
        </List>;
    }
};