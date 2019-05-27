import * as React from "react";

import { CloudFactory } from "../cloudstorage";

import { AppBar } from 'react-toolbox/lib/app_bar';
import { Layout, NavDrawer, Panel } from 'react-toolbox/lib/layout';
import { List, ListItem, ListSubHeader, ListDivider, ListCheckbox } from 'react-toolbox/lib/list';

export interface MainState {
    content: string,
    authorizeUrl: string,
    providers: string,
    drawerActive: boolean
}

export class Main extends React.Component<{}, MainState> {
    state = {
        content: "",
        authorizeUrl: "",
        providers: "",
        drawerActive: false
    }

    toggleDrawerActive = () => {
        this.setState({ drawerActive: !this.state.drawerActive })
    }

    async componentDidMount() {
        const factory = new CloudFactory();

        this.setState({
            providers: factory.availableProviders().toString(),
            authorizeUrl: factory.authorizeUrl("google")
        });

        const access = factory.createAccess(process.env.CLOUD_TYPE, process.env.CLOUD_TOKEN);
        const page = await access.listDirectoryPage(access.root(), "");

        this.setState({ content: page.items.reduce((accumulator, current) => accumulator + "\n" + current.filename(), "") });

        page.destroy();
        access.destroy();
        factory.destroy();
    }

    render() {
        return <Layout>
            <NavDrawer active={this.state.drawerActive} onOverlayClick={this.toggleDrawerActive}>
                <List>
                    <ListItem caption="Add account"></ListItem>
                </List>
            </NavDrawer>
            <Panel>
                <AppBar leftIcon='menu' onLeftIconClick={this.toggleDrawerActive} />
                <div style={{ flex: 1, overflowY: 'auto', padding: '1.8rem' }}>
                    <p>Google auth url: {this.state.authorizeUrl}</p>
                    <p>Content: {this.state.content}</p>
                    <p>Providers: {this.state.providers}</p>
                </div>
            </Panel>
        </Layout>;
    }
}