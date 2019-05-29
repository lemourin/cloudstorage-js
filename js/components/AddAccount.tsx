import * as React from "react";

import { CloudFactory } from "../cloudstorage";
import { List, ListItem } from "react-toolbox/lib/list";
import { Link } from 'react-router-dom'

interface AddAccountProps {
    factory: CloudFactory
};

export class AddAccount extends React.Component<AddAccountProps, {}> {
    render() {
        return <List>
            {this.props.factory.availableProviders().map((value, _) => {
                const url = this.props.factory.authorizeUrl(value, {
                    redirectUri: process.env.HOSTNAME,
                    state: value
                });
                if (url.match(`^${process.env.HOSTNAME}.*$`))
                    return <Link key={`${value}-internal`} to={`/auth/${value}`}>
                        <ListItem caption={value} />
                    </Link>
                else
                    return <a key={`${value}-external`} href={url}>
                        <ListItem caption={value} />
                    </a>;
            })}
        </List>;
    }
};