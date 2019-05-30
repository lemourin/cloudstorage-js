import * as React from "react";
import { CloudAccess, CloudItem } from "js/cloudstorage";
import { Link } from "react-router-dom";
import { List, ListItem } from "react-toolbox/lib/list";

interface ListViewProps {
    access: CloudAccess
    path: string
    location: any
}

interface ListViewState {
    currentRoot: CloudItem | undefined
    items: CloudItem[]
}

export default class ListView extends React.Component<ListViewProps, ListViewState> {
    constructor(props: ListViewProps) {
        super(props);
        this.state = {
            currentRoot: undefined,
            items: []
        }
    }

    clear() {
        for (const d of this.state.items) {
            d.destroy();
        }
        this.setState({ items: [] });
    }

    componentDidMount() {
        this.clear();
    }

    async updateList(root: CloudItem) {
        try {
            this.clear();
            let token = "";
            const items: CloudItem[] = [];
            while (true) {
                const list = await this.props.access.listDirectoryPage(root, token);
                for (const d of list.items)
                    items.push(d);
                this.setState({ items });
                if (list.nextToken === "")
                    break;
                token = list.nextToken;
            }
        } catch (e) {
        }
    }

    async componentDidUpdate() {
        if (
            this.props.location.state && this.props.location.state.root && this.props.location.state.root != this.state.currentRoot
        ) {
            this.setState({ currentRoot: this.props.location.state.root });
            await this.updateList(this.props.location.state.root);
        } else if (!this.state.currentRoot) {
            try {
                const currentRoot = await this.props.access.getItem(this.props.path);
                this.setState({ currentRoot });
                await this.updateList(currentRoot);
            } catch (e) {
            }
        }
    }

    componentWillUnmount() {
        if (this.state.currentRoot) {
            this.state.currentRoot.destroy();
        }
        this.clear();
    }

    render() {
        return <div>
            Listing view {this.props.path}
            <List>
                {
                    this.state.items.map((value: CloudItem) => {
                        return <Link key={value.id()} to={{
                            pathname: `${encodeURIComponent(value.filename())}/`,
                            state: {
                                root: value.copy()
                            }
                        }}>
                            <ListItem caption={value.filename()} />
                        </Link>;
                    })
                }
            </List>
        </div>
    }
};